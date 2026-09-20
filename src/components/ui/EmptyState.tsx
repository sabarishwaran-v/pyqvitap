import { FileSearch } from "lucide-react";

export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <FileSearch className="w-16 h-16 text-gray-500 mb-4" />
      <h2 className="text-2xl font-semibold text-gray-200">
        No Papers Found
      </h2>
      <p className="text-gray-400 mt-2 max-w-md">
        Looks like there are no papers for the filters you’ve applied.
        Try resetting your filters to see all available papers.
      </p>
    </div>
  );
}