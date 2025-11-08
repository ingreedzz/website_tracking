<template>
  <article class="order-card">
    <h4>Order #{{ order.id }}</h4>
    <p><strong>Customer:</strong> {{ order.customer }}</p>
    <p><strong>Status:</strong> {{ order.status }}</p>
    <div class="actions">
      <button @click="$emit('view', order.id)">View</button>
      <button @click="$emit('track', order.id)">Track</button>
    </div>
  </article>
</template>

<script>
export default {
  name: 'OrderCard',
  props: { order: { type: Object, required: true } }
}
</script>

<style scoped>
.order-card { background: #fff; padding: 1rem; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.06); margin-bottom: .75rem }
.actions { margin-top: .5rem }
.actions button { margin-right: .5rem }
</style>
