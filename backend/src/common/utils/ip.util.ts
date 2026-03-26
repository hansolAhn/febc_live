function ipToNumber(ip: string) {
  return ip
    .split(".")
    .map((part) => Number(part))
    .reduce((result, octet) => (result << 8) + octet, 0) >>> 0;
}

export function isIpAllowed(ip: string, cidrs: string[]) {
  if (!ip || cidrs.length === 0) {
    return false;
  }

  return cidrs.some((cidr) => {
    const [network, prefix] = cidr.split("/");
    if (!network || !prefix) {
      return cidr === ip;
    }

    const prefixLength = Number(prefix);
    const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;

    return (ipToNumber(ip) & mask) === (ipToNumber(network) & mask);
  });
}
