<template>
  <div class="bg-gray-100 text-gray-800">
    <!-- Main Content -->
    <main>
      <!-- Hero Section -->
      <section class="bg-blue-500 text-white text-center py-20">
        <div class="container mx-auto px-4">
          <h2 class="text-4xl font-bold mb-4">Track Your Orders with Ease</h2>
          <p class="text-lg mb-6">Stay updated on your printing orders with Chiangho's reliable tracking system.</p>
          <a href="#services" class="bg-white text-blue-500 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200">
            Get Started
          </a>
        </div>
      </section>

      <!-- About Section -->
      <section id="about" class="py-16 bg-gray-100">
        <div class="container mx-auto px-4">
          <h3 class="text-3xl font-bold text-center mb-8">About Us</h3>
          <p class="text-center text-lg">
            Chiangho Sablon Printing Service is dedicated to providing high-quality printing services with a focus on customer satisfaction. Our order tracking system ensures you stay informed every step of the way.
          </p>
        </div>
      </section>

      <!-- Services Section with images -->
      <section id="services" class="py-16 bg-white">
        <div class="container mx-auto px-4">
          <h3 class="text-3xl font-bold text-center mb-8">Our Services</h3>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div class="overflow-hidden rounded-lg shadow-md">
              <img src="/image/sablon_printing.jpg" alt="Custom Printing" class="w-full h-48 object-cover">
              <div class="p-6 bg-white">
                <h4 class="text-xl font-bold mb-2">Custom Printing</h4>
                <p>High-quality custom printing for all your needs, including t-shirts, banners, and more.</p>
              </div>
            </div>
            <div class="overflow-hidden rounded-lg shadow-md">
              <img src="/image/order_tracking.jpg" alt="Order Tracking" class="w-full h-48 object-cover">
              <div class="p-6 bg-white">
                <h4 class="text-xl font-bold mb-2">Order Tracking</h4>
                <p>Track your orders in real-time and stay updated on the progress of your printing jobs.</p>
              </div>
            </div>
            <div class="overflow-hidden rounded-lg shadow-md">
              <img src="/image/fast_delivery.jpg" alt="Fast Delivery" class="w-full h-48 object-cover">
              <div class="p-6 bg-white">
                <h4 class="text-xl font-bold mb-2">Fast Delivery</h4>
                <p>Get your orders delivered quickly and efficiently with our reliable delivery service.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Footer is handled globally; removed duplicate footer from Home -->
  </div>
</template>

<script>
export default {
  name: 'Home',
  data() {
    return { form: { name: '', email: '', message: '' } }
  },
  methods: {
    onSubmit() { alert(`Message sent from ${this.form.name} (${this.form.email})`) }
  }
}
</script>
