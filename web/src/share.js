// Copy a link to a Maker Lab level. The link opens the museum at the Maker Lab with the level loaded.
export async function shareLevel(game, toast) {
  const url = location.href.split('#')[0] + '#maker=' + game.levelCode();
  try { await navigator.clipboard.writeText(url); toast?.('🔗', 'Link copied', 'Send it to a friend to let them play your level.'); }
  catch { window.prompt('Copy this link to share your level:', url); }
}
