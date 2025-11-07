const supabase = require('../backend/supabaseClient');

async function getAllOrders() {
  const { data, error } = await supabase.from('orders').select('*');
  if (error) throw new Error(error.message);
  return data;
}

module.exports = { getAllOrders };