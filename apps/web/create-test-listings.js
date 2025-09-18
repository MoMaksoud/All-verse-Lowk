#!/usr/bin/env node

const testListings = [
  {
    title: "iPhone 13 Pro - Like New",
    description: "Unlocked iPhone 13 Pro in excellent condition. No scratches, battery health 95%. Comes with original box and charger.",
    price: 899,
    category: "electronics",
    condition: "like-new",
    images: ["/images/iphone-14.jpg"],
    inventory: 1
  },
  {
    title: "Nike Air Max 270 - Size 10",
    description: "Classic Nike Air Max 270 in black and white. Worn a few times, excellent condition. Perfect for daily wear.",
    price: 120,
    category: "fashion",
    condition: "good",
    images: ["/images/air-max-270.avif"],
    inventory: 2
  },
  {
    title: "MacBook Pro M2 - 13 inch",
    description: "Apple MacBook Pro with M2 chip, 8GB RAM, 256GB SSD. Perfect for students and professionals. Includes charger.",
    price: 1299,
    category: "electronics",
    condition: "like-new",
    images: ["/images/macbook-m2.jpg"],
    inventory: 1
  },
  {
    title: "Coffee Table - Modern Design",
    description: "Beautiful modern coffee table in excellent condition. Perfect for living room or office. Easy to assemble.",
    price: 150,
    category: "home",
    condition: "good",
    images: ["/images/coffeeetable.jpg"],
    inventory: 1
  },
  {
    title: "Tennis Racket - Professional Grade",
    description: "Professional tennis racket used by competitive players. Excellent condition, recently restrung. Perfect for serious players.",
    price: 85,
    category: "sports",
    condition: "good",
    images: ["/images/tennis-racket.avif"],
    inventory: 3
  },
  {
    title: "Yoga Mat - Premium Quality",
    description: "High-quality yoga mat with excellent grip. Non-slip surface, easy to clean. Perfect for home workouts.",
    price: 45,
    category: "sports",
    condition: "new",
    images: ["/images/yoga-mat.avif"],
    inventory: 5
  },
  {
    title: "Basketball - Official Size",
    description: "Official size basketball in great condition. Perfect for outdoor courts. Good grip and bounce.",
    price: 25,
    category: "sports",
    condition: "good",
    images: ["/images/basketball.avif"],
    inventory: 4
  },
  {
    title: "Alexa Echo Dot - 4th Gen",
    description: "Amazon Echo Dot smart speaker. Voice controlled, connects to smart home devices. Like new condition.",
    price: 35,
    category: "electronics",
    condition: "like-new",
    images: ["/images/Alexa.jpeg"],
    inventory: 2
  }
];

async function createTestListings() {
  console.log('🛍️ Creating test listings...\n');

  for (const listing of testListings) {
    try {
      const response = await fetch('http://localhost:3000/api/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'test-user-1', // Using a test user ID
        },
        body: JSON.stringify(listing),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Created: ${listing.title} - $${listing.price}`);
      } else {
        console.log(`❌ Failed to create: ${listing.title}`);
      }
    } catch (error) {
      console.log(`❌ Error creating ${listing.title}:`, error.message);
    }
  }

  console.log('\n🎉 Test listings created! You can now test the cart functionality.');
  console.log('📝 Go to http://localhost:3000/listings to see your listings');
}

// Check if server is running
fetch('http://localhost:3000/api/listings')
  .then(() => {
    createTestListings();
  })
  .catch(() => {
    console.log('❌ Server not running. Please start your development server first:');
    console.log('   npm run dev');
    console.log('\nThen run this script again:');
    console.log('   node create-test-listings.js');
  });
