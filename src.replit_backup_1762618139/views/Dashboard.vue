<template>
  <section class="dashboard container">
    <h2>Orders</h2>
    <div v-if="orders.length === 0">No orders yet.</div>
    <div v-else>
      <OrderCard v-for="o in orders" :key="o.id" :order="o" @view="goToDetail" @track="trackOrder" />
    </div>
  </section>
</template>

<script>
import OrderCard from '../components/OrderCard.vue'
import { ref } from 'vue'

export default {
  name: 'Dashboard',
  components: { OrderCard },
  setup() {
    const orders = ref([
      { id: 1001, customer: 'Alice', status: 'Processing' },
      { id: 1002, customer: 'Bob', status: 'Shipped' }
    ])

    function goToDetail(id) { this.$router.push({ name: 'OrderDetail', params: { id } }) }
    function trackOrder(id) { alert('Track order ' + id) }

    return { orders, goToDetail, trackOrder }
  }
}
</script>

<style scoped>
.dashboard { padding: 1rem }
</style>
