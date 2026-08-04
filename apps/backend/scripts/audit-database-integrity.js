"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const [counts, duplicateEmails, duplicatePhones, duplicateDefaultAddresses, duplicateMarketingEntries, negativeInventory, invalidOrderAmounts,] = await Promise.all([
        Promise.all([
            prisma.user.count(),
            prisma.product.count(),
            prisma.order.count(),
            prisma.orderItem.count(),
            prisma.cartItem.count(),
            prisma.userAddress.count(),
            prisma.productVariant.count(),
            prisma.analyticsEvent.count(),
            prisma.chatMessage.count(),
            prisma.notification.count(),
            prisma.marketingListEntry.count(),
        ]),
        prisma.user.groupBy({
            by: ['email'],
            where: { email: { not: null } },
            _count: { _all: true },
            having: { email: { _count: { gt: 1 } } },
        }),
        prisma.user.groupBy({
            by: ['phone'],
            where: { phone: { not: null } },
            _count: { _all: true },
            having: { phone: { _count: { gt: 1 } } },
        }),
        prisma.userAddress.groupBy({
            by: ['zaloUserId'],
            where: { isDefault: true },
            _count: { _all: true },
            having: { zaloUserId: { _count: { gt: 1 } } },
        }),
        prisma.marketingListEntry.groupBy({
            by: ['listId', 'phone'],
            _count: { _all: true },
            having: { phone: { _count: { gt: 1 } } },
        }),
        prisma.productVariant.findMany({
            where: { stock: { lt: 0 } },
            select: { id: true, stock: true },
        }),
        prisma.order.findMany({
            where: {
                OR: [{ totalAmount: { lt: 0 } }, { discountAmount: { lt: 0 } }],
            },
            select: { id: true, totalAmount: true, discountAmount: true },
        }),
    ]);
    const names = [
        'users',
        'products',
        'orders',
        'orderItems',
        'cartItems',
        'addresses',
        'variants',
        'analyticsEvents',
        'chatMessages',
        'notifications',
        'marketingListEntries',
    ];
    console.log(JSON.stringify({
        counts: Object.fromEntries(names.map((name, index) => [name, counts[index]])),
        issues: {
            duplicateEmails,
            duplicatePhones,
            duplicateDefaultAddresses,
            duplicateMarketingEntries,
            negativeInventory,
            invalidOrderAmounts,
        },
    }, null, 2));
}
main()
    .catch((error) => {
    console.error(error);
    process.exitCode = 1;
})
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=audit-database-integrity.js.map