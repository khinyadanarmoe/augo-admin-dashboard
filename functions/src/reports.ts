import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// High severity categories that trigger auto-removal
const HIGH_SEVERITY_CATEGORIES = [
    "threats_violence",
    "inappropriate",
    "hate_speech",
    "scam",
];

// Backward-compatible aliases for legacy or iOS-side category values
const REPORT_CATEGORY_ALIASES: Record<string, string> = {
    threat: "threats_violence",
    violence: "threats_violence",
    threat_violence: "threats_violence",
    threat_and_violence: "threats_violence",
    threats_and_violence: "threats_violence",
    inappropriate_content: "inappropriate",
};

function normalizeReportCategory(category: unknown): string {
    if (typeof category !== "string") {
        return "";
    }

    const normalized = category
        .trim()
        .toLowerCase()
        .replace(/[\s/&-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_|_$/g, "");

    return REPORT_CATEGORY_ALIASES[normalized] || normalized;
}

/**
 * Cloud Function: Auto-remove posts when reported with high severity
 * Triggers when a new report is created
 */
export const handleNewReport = functions.firestore
    .document("reports/{reportId}")
    .onCreate(async (snapshot, context) => {
        const report = snapshot.data();
        const reportId = context.params.reportId;
        const normalizedCategory = normalizeReportCategory(report.category);

        console.log(`[handleNewReport] Triggered for report ${reportId}`);
        console.log(`[handleNewReport] Report category: ${report.category}`);
        console.log(`[handleNewReport] Normalized category: ${normalizedCategory}`);
        console.log(`[handleNewReport] High severity categories:`, HIGH_SEVERITY_CATEGORIES);

        try {
            if (normalizedCategory && normalizedCategory !== report.category) {
                await snapshot.ref.update({
                    category: normalizedCategory,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }

            // Check if report category is high severity
            if (HIGH_SEVERITY_CATEGORIES.includes(normalizedCategory)) {
                console.log(`[handleNewReport] Category "${normalizedCategory}" is HIGH SEVERITY - proceeding with auto-removal`);
                const postId = report.postId;

                if (!postId) {
                    console.error(`Report ${reportId} missing postId`);
                    return;
                }

                // Update post status to 'removed'
                const postRef = admin.firestore().collection("posts").doc(postId);
                const postSnapshot = await postRef.get();

                if (!postSnapshot.exists) {
                    console.error(`Post ${postId} not found`);
                    return;
                }

                await postRef.update({
                    status: "removed",
                    removedAt: admin.firestore.FieldValue.serverTimestamp(),
                    removedReason: `Auto-removed due to high severity report: ${normalizedCategory}`,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Update report status to resolved (since action was taken)
                await snapshot.ref.update({
                    status: "resolved",
                    autoRemoved: true,
                    category: normalizedCategory || report.category,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                console.log(
                    `Post ${postId} auto-removed due to high severity report: ${normalizedCategory}`
                );

                // Optionally: Send notification to reported user
                const reportedUserId = report.reported?.id;
                if (reportedUserId) {
                    await admin.firestore().collection("user_notifications").add({
                        userId: reportedUserId,
                        type: "post_removed",
                        title: "Post Removed",
                        message: `Your post was removed due to a ${(normalizedCategory || "policy").replace(/_/g, " ")} violation.`,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        read: false,
                        data: {
                            postId,
                            reportId,
                            category: normalizedCategory || report.category,
                        },
                    });
                }
            } else {
                console.log(`[handleNewReport] Category "${normalizedCategory || report.category}" is NOT high severity - no auto-removal`);
            }
        } catch (error) {
            console.error("[handleNewReport] Error handling new report:", error);
            throw error;
        }

        console.log(`[handleNewReport] Completed processing for report ${reportId}`);
    });

/**
 * Cloud Function: Update report metrics when reports change
 * Useful for tracking report statistics
 */
export const updateReportMetrics = functions.firestore
    .document("reports/{reportId}")
    .onWrite(async (change, context) => {
        try {
            const metricsRef = admin.firestore().collection("metrics").doc("reports");

            // Count reports by category and severity
            const reportsSnapshot = await admin
                .firestore()
                .collection("reports")
                .get();

            const categoryCounts: Record<string, number> = {};
            const severityCounts = {
                high: 0,
                medium: 0,
                low: 0,
                other: 0,
            };
            const statusCounts = {
                pending: 0,
                resolved: 0,
                dismissed: 0,
            };

            reportsSnapshot.docs.forEach((doc) => {
                const report = doc.data();
                const normalizedCategory = normalizeReportCategory(report.category) || "other";

                // Count by category
                categoryCounts[normalizedCategory] =
                    (categoryCounts[normalizedCategory] || 0) + 1;

                // Count by severity
                if (HIGH_SEVERITY_CATEGORIES.includes(normalizedCategory)) {
                    severityCounts.high++;
                } else if (
                    ["harassment", "impersonation", "misinformation"].includes(
                        normalizedCategory
                    )
                ) {
                    severityCounts.medium++;
                } else if (normalizedCategory === "spam") {
                    severityCounts.low++;
                } else {
                    severityCounts.other++;
                }

                // Count by status
                if (report.status in statusCounts) {
                    statusCounts[report.status as keyof typeof statusCounts]++;
                }
            });

            await metricsRef.set(
                {
                    categoryCounts,
                    severityCounts,
                    statusCounts,
                    totalReports: reportsSnapshot.size,
                    lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
                },
                { merge: true }
            );
        } catch (error) {
            console.error("Error updating report metrics:", error);
        }
    });
