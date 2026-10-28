-- One-off: em dashes removed from three quotes (2026-10-28). Safe to re-run.
update kotes.quotes set body = 'Two roads diverged in a wood, and I, I took the one less traveled by, and that has made all the difference.' where body = 'Two roads diverged in a wood, and I — I took the one less traveled by, and that has made all the difference.';
update kotes.quotes set body = 'Have no fear of perfection; you''ll never reach it.' where body = 'Have no fear of perfection — you''ll never reach it.';
update kotes.quotes set body = 'Beauty is truth, truth beauty; that is all ye know on earth, and all ye need to know.' where body = 'Beauty is truth, truth beauty, — that is all ye know on earth, and all ye need to know.';
