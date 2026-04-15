export function isValidIpv4(ip) {
    const parts = ip.split(".");
    if (parts.length !== 4)
        return false;
    return parts.every((part) => {
        if (!/^\d+$/.test(part))
            return false;
        const value = Number(part);
        return value >= 0 && value <= 255;
    });
}
export function ipv4ToInt(ip) {
    if (!isValidIpv4(ip)) {
        throw new Error(`Invalid IPv4 address: ${ip}`);
    }
    return ip
        .split(".")
        .map(Number)
        .reduce((acc, octet) => ((acc << 8) | octet) >>> 0, 0);
}
export function intToIpv4(value) {
    return [
        (value >>> 24) & 255,
        (value >>> 16) & 255,
        (value >>> 8) & 255,
        value & 255,
    ].join(".");
}
export function parseCidr(input) {
    const [ip, prefixText] = input.split("/");
    const prefix = Number(prefixText);
    if (!ip || prefixText === undefined || !isValidIpv4(ip) || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
        throw new Error(`Invalid CIDR: ${input}`);
    }
    const ipInt = ipv4ToInt(ip);
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    const network = ipInt & mask;
    const broadcast = (network | (~mask >>> 0)) >>> 0;
    return {
        original: input,
        ip,
        prefix,
        mask,
        network,
        broadcast,
    };
}
export function canonicalCidr(input) {
    const parsed = parseCidr(input);
    return `${intToIpv4(parsed.network)}/${parsed.prefix}`;
}
export function dottedMaskFromPrefix(prefix) {
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
        throw new Error(`Invalid prefix: ${prefix}`);
    }
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return intToIpv4(mask);
}
export function wildcardMaskFromPrefix(prefix) {
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
        throw new Error(`Invalid prefix: ${prefix}`);
    }
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return intToIpv4((~mask >>> 0) >>> 0);
}
export function totalAddressCount(prefix) {
    if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
        throw new Error(`Invalid prefix: ${prefix}`);
    }
    return 2 ** (32 - prefix);
}
export function containsIp(cidr, ip) {
    const ipInt = ipv4ToInt(ip);
    return ipInt >= cidr.network && ipInt <= cidr.broadcast;
}
export function cidrsOverlap(a, b) {
    return a.network <= b.broadcast && b.network <= a.broadcast;
}
export function classifySegmentRole(input) {
    const text = (input || "").toLowerCase();
    if (!text.trim())
        return "OTHER";
    if (text.includes("guest"))
        return "GUEST";
    if (text.includes("server") || text.includes("dmz"))
        return "SERVER";
    if (text.includes("management") || text.includes("mgmt") || text.includes("admin-mgmt"))
        return "MANAGEMENT";
    if (text.includes("voice") || text.includes("voip"))
        return "VOICE";
    if (text.includes("printer") || text.includes("print"))
        return "PRINTER";
    if (text.includes("iot") || text.includes("ot") || text.includes("medical") || text.includes("lab"))
        return "IOT";
    if (text.includes("camera") || text.includes("cctv") || text.includes("surveillance"))
        return "CAMERA";
    if (text.includes("wan") || text.includes("transit") || text.includes("p2p") || text.includes("point-to-point"))
        return "WAN_TRANSIT";
    if (text.includes("loopback") || text.includes("lo0"))
        return "LOOPBACK";
    if (text.includes("user") || text.includes("staff") || text.includes("client") || text.includes("admin"))
        return "USER";
    return "OTHER";
}
export function usableHostCount(cidr, role = "OTHER") {
    if (cidr.prefix === 32)
        return role === "LOOPBACK" ? 1 : 0;
    if (cidr.prefix === 31)
        return role === "WAN_TRANSIT" ? 2 : 0;
    return Math.max(0, 2 ** (32 - cidr.prefix) - 2);
}
export function firstUsableIp(cidr, role = "OTHER") {
    if (cidr.prefix === 32)
        return role === "LOOPBACK" ? intToIpv4(cidr.network) : null;
    if (cidr.prefix === 31)
        return role === "WAN_TRANSIT" ? intToIpv4(cidr.network) : null;
    if (cidr.prefix >= 31)
        return null;
    return intToIpv4(cidr.network + 1);
}
export function lastUsableIp(cidr, role = "OTHER") {
    if (cidr.prefix === 32)
        return role === "LOOPBACK" ? intToIpv4(cidr.network) : null;
    if (cidr.prefix === 31)
        return role === "WAN_TRANSIT" ? intToIpv4(cidr.broadcast) : null;
    if (cidr.prefix >= 31)
        return null;
    return intToIpv4(cidr.broadcast - 1);
}
export function isNetworkAddress(cidr, ip) {
    return ipv4ToInt(ip) === cidr.network;
}
export function isBroadcastAddress(cidr, ip) {
    return ipv4ToInt(ip) === cidr.broadcast;
}
export function suggestedGatewayPattern(ip) {
    const lastOctet = Number(ip.split(".").at(-1));
    return lastOctet === 1 || lastOctet === 254;
}
export function describeRange(cidr) {
    return `${intToIpv4(cidr.network)} - ${intToIpv4(cidr.broadcast)}`;
}
export function describeSubnet(cidr, role = "OTHER") {
    return {
        canonicalCidr: `${intToIpv4(cidr.network)}/${cidr.prefix}`,
        networkAddress: intToIpv4(cidr.network),
        broadcastAddress: intToIpv4(cidr.broadcast),
        firstUsableIp: firstUsableIp(cidr, role),
        lastUsableIp: lastUsableIp(cidr, role),
        dottedMask: dottedMaskFromPrefix(cidr.prefix),
        wildcardMask: wildcardMaskFromPrefix(cidr.prefix),
        totalAddresses: totalAddressCount(cidr.prefix),
        usableAddresses: usableHostCount(cidr, role),
    };
}
export function recommendedPrefixForHosts(hosts, role = "OTHER") {
    const bufferMultiplier = role === "USER" || role === "GUEST" || role === "VOICE" ? 1.3 : 1.2;
    const minimumRequired = role === "WAN_TRANSIT" ? 2 : role === "LOOPBACK" ? 1 : 2;
    const target = Math.max(minimumRequired, Math.ceil(hosts * bufferMultiplier));
    if (role === "LOOPBACK")
        return 32;
    if (role === "WAN_TRANSIT" && target <= 2)
        return 31;
    for (let prefix = 30; prefix >= 1; prefix -= 1) {
        if (usableHostCount(parseCidr(`0.0.0.0/${prefix}`), role) >= target)
            return prefix;
    }
    return 1;
}
