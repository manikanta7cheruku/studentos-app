import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/app/spinner";

/** Under a list: Show more while there is more, otherwise a quiet "that is everything". */
export function PagedFooter({
  hasMore,
  loadingMore,
  moreError,
  onMore,
  count,
}: {
  hasMore: boolean;
  loadingMore: boolean;
  moreError: string | null;
  onMore: () => void;
  count: number;
}) {
  if (count === 0) return null;
  return hasMore ? (
    <div className="flex flex-col items-start gap-2">
      <Button variant="outline" size="lg" onClick={onMore} disabled={loadingMore}>
        {loadingMore ? <Spinner /> : null} Show more
      </Button>
      {moreError ? <p className="text-[15px] text-danger">{moreError}</p> : null}
    </div>
  ) : (
    <p className="text-[15px] text-ink-muted">That is everything.</p>
  );
}
