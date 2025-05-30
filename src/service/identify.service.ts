import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const identifyContact = async (email?: string, phoneNumber?: string) => {
  if (!email && !phoneNumber) {
    throw new Error('At least one of email or phoneNumber is required');
  }

  const contacts = await prisma.contact.findMany({
    where: {
      OR: [
        { email: email || undefined },
        { phoneNumber: phoneNumber || undefined },
      ],
    },
    orderBy: {createdAt: 'asc' },
  });

  if (contacts.length === 0) {
    const newContact = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'primary',
      },
    });

    return formatContactResponse([newContact]);
  }

  let primaryContact = contacts.find(c => c.linkPrecedence === 'primary') || contacts[0];

  for (const contact of contacts) {
    if (contact.createdAt < primaryContact.createdAt) {
      primaryContact = contact;
    }
  }

  const updates: Promise<any>[] = [];
  for (const contact of contacts) {
    if (
      contact.id !== primaryContact.id &&
      (contact.linkPrecedence !== 'secondary' || contact.linkedId !== primaryContact.id)
    ) {
      updates.push(
        prisma.contact.update({
          where: { id: contact.id },
          data: {
            linkPrecedence: 'secondary',
            linkedId: primaryContact.id,
          },
        })
      );
    }
  }

  await Promise.all(updates);

  const existingContact = contacts.find(
    c => c.email === email && c.phoneNumber === phoneNumber
  );

  if (!existingContact) {
    await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: 'secondary',
        linkedId: primaryContact.id,
      },
    });
  }

  const allContacts = await prisma.contact.findMany({
    where: {
      OR: [
        { id: primaryContact.id },
        { linkedId: primaryContact.id },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });

  return formatContactResponse(allContacts);
};

function formatContactResponse(contacts: any[]) {
  const primary = contacts.find(c => c.linkPrecedence === 'primary');

  const emails = new Set<string>();
  const phoneNumbers = new Set<string>();
  const secondaryContactIds: number[] = [];

  for (const contact of contacts) {
    if (contact.email) emails.add(contact.email);
    if (contact.phoneNumber) phoneNumbers.add(contact.phoneNumber);
    if (contact.linkPrecedence === 'secondary') {
      secondaryContactIds.push(contact.id);
    }
  }

  return {
    primaryContactId: primary.id,
    emails: Array.from(emails),
    phoneNumbers: Array.from(phoneNumbers),
    secondaryContactIds,
  };
}
