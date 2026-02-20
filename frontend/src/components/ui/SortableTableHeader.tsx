import React from "react";

interface SortableTableHeaderProps<T extends string> {
  field: T;
  label: string;
  currentSortField: T | null;
  sortOrder: "asc" | "desc";
  onSort: (field: T) => void;
  className?: string;
}

export function SortableTableHeader<T extends string>({
  field,
  label,
  currentSortField,
  sortOrder,
  onSort,
  className = "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider",
}: SortableTableHeaderProps<T>) {
  const getSortIcon = () => {
    if (currentSortField !== field) return "↕";
    return sortOrder === "asc" ? "↑" : "↓";
  };

  return (
    <th className={className}>
      <button
        onClick={() => onSort(field)}
        className="flex items-center space-x-1 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
      >
        <span>{label}</span>
        <span className="text-sm">{getSortIcon()}</span>
      </button>
    </th>
  );
}

interface RegularTableHeaderProps {
  label: string;
  className?: string;
}

export function RegularTableHeader({
  label,
  className = "px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider",
}: RegularTableHeaderProps) {
  return <th className={className}>{label}</th>;
}
