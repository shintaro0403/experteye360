/** GitHub Pages 用 base。VITE_PAGES_REPO=experteye360 のとき /experteye360/participant/ 等 */
export function appBasePath(appSegment, repo = process.env.VITE_PAGES_REPO?.trim()) {
  return repo ? `/${repo}/${appSegment}/` : `/${appSegment}/`;
}

export function viteAppBase(appSegment) {
  return appBasePath(appSegment);
}
