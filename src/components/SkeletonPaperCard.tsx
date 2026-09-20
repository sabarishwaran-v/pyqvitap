import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonPaperCardProps {
  length?: number;
}

export default function SkeletonPaperCard({ length = 4 }: SkeletonPaperCardProps) {
  return (
    <>
      {Array.from({ length }).map((_, idx) => (
        <div
          key={idx}
          className="cursor-pointer rounded-sm border-2 border-[#734DFF] bg-[#FFFFFF] text-black shadow-lg transition duration-150 ease-in-out hover:bg-[#EFEAFF] dark:border-[#36266D] dark:bg-[#171720] dark:text-white hover:dark:bg-[#262635]"
        >
          <div className="border-b-2 border-[#453D60] p-2">
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
          <div className="flex flex-col justify-between p-4">
            <Skeleton className="mb-4 h-6 w-32 rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-7 w-16 rounded-full" />
              <Skeleton className="h-7 w-16 rounded-full" />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
