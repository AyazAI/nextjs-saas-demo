import { noticeMessage } from "@/domain/notices";
import { safeQueryMessage } from "@/domain/text";

export function Flash({ error, notice }: { error?: string; notice?: string }) {
  const errorMessage = safeQueryMessage(error);
  const noticeText = noticeMessage(notice);
  if (!errorMessage && !noticeText) return null;
  return (
    <>
      {errorMessage ? (
        <p className="banner bad" role="alert">
          {errorMessage}
        </p>
      ) : null}
      {noticeText ? (
        <p className="banner good" role="status">
          {noticeText}
        </p>
      ) : null}
    </>
  );
}
