const supabase = require('../backend/supabaseClient');

async function getAllUsers() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) throw new Error(error.message);
  return data;
}

module.exports = { getAllUsers };