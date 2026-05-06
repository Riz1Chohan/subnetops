import prismaClientPkg from "@prisma/client";
import bcrypt from "bcryptjs";

const { PrismaClient } = prismaClientPkg as { PrismaClient: new () => any };
const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Demo1234!", 10);

  const user = await prisma.user.upsert({
    where: { email: "demo@subnetops.local" },
    update: { fullName: "Demo User", passwordHash },
    create: {
      email: "demo@subnetops.local",
      fullName: "Demo User",
      passwordHash,
      planTier: "PAID",
    },
  });

  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  const existingProject = await prisma.project.findFirst({
    where: { userId: user.id, name: "HealthPlus Clinics" },
  });

  if (existingProject) return;

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: "HealthPlus Clinics",
      description: "Demo multi-site healthcare planning project",
      organizationName: "HealthPlus",
      environmentType: "clinic",
      basePrivateRange: "10.10.0.0/16",
      reportHeader: "HealthPlus Network Report",
      reportFooter: "Confidential internal planning document",
    },
  });

  const hq = await prisma.site.create({
    data: {
      projectId: project.id,
      name: "HQ",
      location: "Toronto",
      siteCode: "TOR",
      defaultAddressBlock: "10.10.0.0/16",
      notes: "Main office",
    },
  });

  const mississauga = await prisma.site.create({
    data: {
      projectId: project.id,
      name: "Mississauga Clinic",
      location: "Mississauga",
      siteCode: "MIS",
      defaultAddressBlock: "10.11.0.0/16",
      notes: "Branch clinic",
    },
  });

  const brampton = await prisma.site.create({
    data: {
      projectId: project.id,
      name: "Brampton Clinic",
      location: "Brampton",
      siteCode: "BRA",
      defaultAddressBlock: "10.12.0.0/16",
      notes: "Branch clinic",
    },
  });

  await prisma.vlan.createMany({
    data: [
      {
        siteId: hq.id,
        vlanId: 10,
        vlanName: "ADMIN",
        purpose: "Administrative workstations",
        subnetCidr: "10.10.10.0/24",
        gatewayIp: "10.10.10.1",
        dhcpEnabled: true,
        estimatedHosts: 60,
        department: "Administration",
        notes: "Primary admin VLAN",
      },
      {
        siteId: hq.id,
        vlanId: 20,
        vlanName: "CLINICAL",
        purpose: "Clinical devices",
        subnetCidr: "10.10.20.0/24",
        gatewayIp: "10.10.20.1",
        dhcpEnabled: true,
        estimatedHosts: 80,
        department: "Clinical",
        notes: "Medical systems",
      },
      {
        siteId: hq.id,
        vlanId: 30,
        vlanName: "GUEST",
        purpose: "Guest Wi-Fi",
        subnetCidr: "10.10.30.0/24",
        gatewayIp: "10.10.30.1",
        dhcpEnabled: true,
        estimatedHosts: 100,
        department: "Guest",
        notes: "Internet-only access",
      },
      {
        siteId: hq.id,
        vlanId: 50,
        vlanName: "SERVERS",
        purpose: "Servers",
        subnetCidr: "10.10.50.0/24",
        gatewayIp: "10.10.50.1",
        dhcpEnabled: false,
        estimatedHosts: 30,
        department: "Infrastructure",
        notes: "Critical services",
      },
      {
        siteId: hq.id,
        vlanId: 90,
        vlanName: "MANAGEMENT",
        purpose: "Management",
        subnetCidr: "10.11.0.0/24",
        gatewayIp: "10.10.90.1",
        dhcpEnabled: false,
        estimatedHosts: 20,
        department: "IT",
        notes: "Managed devices",
      },
      {
        siteId: mississauga.id,
        vlanId: 10,
        vlanName: "ADMIN",
        purpose: "Administrative workstations",
        subnetCidr: "10.11.10.0/24",
        gatewayIp: "10.11.10.1",
        dhcpEnabled: true,
        estimatedHosts: 30,
        department: "Administration",
      },
      {
        siteId: brampton.id,
        vlanId: 10,
        vlanName: "ADMIN",
        purpose: "Administrative workstations",
        subnetCidr: "10.12.10.0/24",
        gatewayIp: "10.12.10.1",
        dhcpEnabled: true,
        estimatedHosts: 30,
        department: "Administration",
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
