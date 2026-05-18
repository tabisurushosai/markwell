export function getCanonicalUrl(doc: Document = document, loc: Location = location): string {
  const canonicalLink = doc.querySelector('link[rel="canonical"]');
  if (canonicalLink instanceof HTMLLinkElement && canonicalLink.href !== '') {
    return canonicalLink.href;
  }
  return loc.href;
}

export function isDomainBlocked(hostname: string, blockedDomains: string[]): boolean {
  return blockedDomains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

export function isUrlPatternBlocked(href: string, blockedUrlPatterns: string[]): boolean {
  return blockedUrlPatterns.some((pattern) => {
    try {
      return new RegExp(pattern).test(href);
    } catch {
      return false;
    }
  });
}

export function isPageBlocked(
  href: string,
  hostname: string,
  blockedDomains: string[],
  blockedUrlPatterns: string[],
): boolean {
  return isDomainBlocked(hostname, blockedDomains) || isUrlPatternBlocked(href, blockedUrlPatterns);
}
