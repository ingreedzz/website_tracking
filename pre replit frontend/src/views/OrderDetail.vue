<template>
  <section class="container">
    <h2>Order Detail — #{{ id }}</h2>
    <p>This is a placeholder for order details.</p>
  </section>
</template>

<script>
import { useRoute } from 'vue-router'
export default {
  name: 'OrderDetail',
  setup() {
    const route = useRoute()
    const id = route.params.id
    return { id }
  }
}
</script>
