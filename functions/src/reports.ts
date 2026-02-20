import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// High severity categories that trigger auto-removal
const HIGH_SEVERITY_CATEGORIES = [
    "threats_violence",
    "nudity",
    "hate_speech",
    "scam",
];

/**
 * Cloud Function: Auto-remove posts when reported with high severity
 * Triggers when a new report is created
 */
export const handleNewReport = functions.firestore
    .document("reports/{reportId}")
    .onCreate(async (snapshot, context) => {
        const report = snapshot.data();
        const reportId = context.params.reportId;

        try {
            // Check if report category is high severity
            if (HIGH_SEVERITY_CATEGORIES.includes(report.category)) {
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
                    removedReason: `Auto-removed due to high severity report: ${report.category}`,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // Update report status to resolved (since action was taken)
                await snapshot.ref.update({
                    status: "resolved",
                    autoRemoved: true,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                console.log(
                    `Post ${postId} auto-removed due to high severity report: ${report.category}`
                );

                // Optionally: Send notification to reported user
                const reportedUserId = report.reported?.id;
                if (reportedUserId) {
                    await admin.firestore().collection("notifications").add({
                        userId: reportedUserId,
                        type: "post_removed",
                        title: "Post Removed",
                        message: `Your post was removed due to a ${report.category.replace(/_/g, " ")} violation.`,
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        read: false,
                        data: {
                            postId,
                            reportId,
                            category: report.category,
                        },
                    });
                }
            }
        } catch (error) {
            console.error("Error handling new report:", error);
            throw error;
        }
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

                // Count by category
                categoryCounts[report.category] =
                    (categoryCounts[report.category] || 0) + 1;

                // Count by severity
                if (HIGH_SEVERITY_CATEGORIES.includes(report.category)) {
                    severityCounts.high++;
                } else if (
                    ["harassment", "impersonation", "misinformation"].includes(
                        report.category
                    )
                ) {
                    severityCounts.medium++;
                } else if (report.category === "spam") {
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
