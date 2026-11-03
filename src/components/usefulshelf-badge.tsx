export function UsefulShelfBadge() {
  return (
    <a href="https://usefulshelf.co/?utm_source=kotes.pavlin.tech&amp;utm_medium=referral&amp;utm_campaign=badge&amp;utm_content=light" target="_blank" rel="nofollow noopener">
      {/* eslint-disable-next-line @next/next/no-img-element -- UsefulShelf serves the badge itself. */}
      <img src="https://usefulshelf.co/badge/usefulshelf.svg" alt="Featured on UsefulShelf" width={248} height={66} />
    </a>
  );
}
