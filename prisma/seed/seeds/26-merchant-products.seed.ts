import { SeedContext } from "../index";

const productCategories = [
  "Electronics",
  "Clothing",
  "Home & Garden",
  "Sports & Outdoors",
  "Books & Media",
  "Health & Beauty",
  "Automotive",
  "Toys & Games",
  "Food & Beverages",
  "Office Supplies",
];

const productBrands = [
  "EcoDeli Brand",
  "Premium Plus",
  "SmartTech",
  "GreenLife",
  "UrbanStyle",
  "HomeComfort",
  "SportFlex",
  "BeautyGlow",
  "AutoCare",
  "OfficePro",
];

const productNames = [
  "Wireless Bluetooth Headphones",
  "Organic Cotton T-Shirt",
  "Smart LED Light Bulb",
  "Yoga Mat Premium",
  "Digital Kitchen Scale",
  "Natural Face Cream",
  "Car Phone Mount",
  "Educational Puzzle Set",
  "Artisan Coffee Beans",
  "Ergonomic Office Chair",
  "Portable Power Bank",
  "Sustainable Water Bottle",
  "Smart Home Hub",
  "Fitness Tracker Watch",
  "Aromatherapy Diffuser",
  "Wireless Charging Pad",
  "Eco-Friendly Lunch Box",
  "Bluetooth Speaker",
  "Smart Thermostat",
  "Organic Tea Collection",
];

const productDescriptions = [
  "High-quality wireless headphones with noise cancellation technology",
  "Comfortable and breathable cotton t-shirt made from organic materials",
  "Energy-efficient LED bulb with smart connectivity features",
  "Premium yoga mat with excellent grip and cushioning",
  "Precise digital scale perfect for cooking and baking",
  "Natural face cream with moisturizing properties",
  "Universal car phone mount for safe navigation",
  "Educational puzzle set for children and adults",
  "Premium artisan coffee beans from sustainable farms",
  "Comfortable ergonomic office chair with adjustable features",
  "High-capacity portable power bank for mobile devices",
  "Sustainable water bottle made from recycled materials",
  "Smart home hub for controlling connected devices",
  "Advanced fitness tracker with heart rate monitoring",
  "Aromatherapy diffuser for relaxation and wellness",
  "Fast wireless charging pad compatible with all devices",
  "Eco-friendly lunch box with temperature control",
  "Portable Bluetooth speaker with excellent sound quality",
  "Smart thermostat for energy-efficient home heating",
  "Premium organic tea collection from around the world",
];

export async function seedMerchantProducts(ctx: SeedContext) {
  const { prisma } = ctx;

  console.log("   Creating merchant products...");

  // Get all merchants
  const merchants = await prisma.merchant.findMany({
    include: {
      user: true,
    },
  });

  if (merchants.length === 0) {
    console.log("   No merchants found, skipping product creation");
    return [];
  }

  const createdProducts = [];

  for (const merchant of merchants) {
    // Create 5-10 products per merchant
    const productCount = 5 + Math.floor(Math.random() * 6);

    for (let i = 0; i < productCount; i++) {
      const category =
        productCategories[Math.floor(Math.random() * productCategories.length)];
      const brand =
        productBrands[Math.floor(Math.random() * productBrands.length)];
      const nameIndex = Math.floor(Math.random() * productNames.length);
      const name = productNames[nameIndex];
      const description = productDescriptions[nameIndex];

      const price = 10 + Math.random() * 200; // 10-210€
      const originalPrice = price * (1 + Math.random() * 0.3); // 0-30% markup
      const stockQuantity = Math.floor(10 + Math.random() * 100); // 10-110 units
      const minStockAlert = Math.floor(5 + Math.random() * 10); // 5-15 units

      const tags = [
        category.toLowerCase(),
        brand.toLowerCase(),
        "premium",
        "eco-friendly",
        "sustainable",
      ].slice(0, 3 + Math.floor(Math.random() * 3)); // 3-5 tags

      const product = await prisma.product.create({
        data: {
          merchantId: merchant.id,
          name,
          description,
          price: parseFloat(price.toFixed(2)),
          originalPrice: parseFloat(originalPrice.toFixed(2)),
          sku: `SKU-${merchant.id.slice(-6)}-${i + 1}`,
          category,
          brand,
          weight: parseFloat((0.1 + Math.random() * 5).toFixed(2)), // 0.1-5.1 kg
          dimensions: {
            length: parseFloat((10 + Math.random() * 50).toFixed(1)),
            width: parseFloat((5 + Math.random() * 30).toFixed(1)),
            height: parseFloat((2 + Math.random() * 20).toFixed(1)),
          },
          images: [
            `https://picsum.photos/400/400?random=${Math.floor(Math.random() * 1000)}`,
            `https://picsum.photos/400/400?random=${Math.floor(Math.random() * 1000)}`,
          ],
          isActive: Math.random() > 0.1, // 90% active
          stockQuantity,
          minStockAlert,
          tags,
          metadata: {
            createdAt: new Date().toISOString(),
            merchantName: merchant.companyName,
            category: category,
            brand: brand,
          },
        },
      });

      createdProducts.push(product);
      console.log(`   ✓ Created product: ${product.name} (${product.price}€)`);
    }
  }

  console.log(
    `   ✓ Created ${createdProducts.length} products for ${merchants.length} merchants`,
  );

  return createdProducts;
}
