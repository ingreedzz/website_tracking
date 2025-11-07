const { supabaseQuery } = require('./supabase');

// Generic error handler
const handleDatabaseError = (error, operation) => {
    console.error(`Database ${operation} error:`, error);
    throw new Error(`Database operation failed: ${error.message}`);
};

// Example query function with error handling
async function executeQuery(queryFn, operation = 'query') {
    try {
        return await supabaseQuery(queryFn);
    } catch (error) {
        handleDatabaseError(error, operation);
    }
}

// Health check function
async function checkDatabaseConnection() {
    try {
        const result = await supabaseQuery(async (supabase) => {
            const { data, error } = await supabase.from('users').select('count').limit(1);
            if (error) throw error;
            return data;
        });
        return { status: 'connected', timestamp: new Date().toISOString() };
    } catch (error) {
        console.error('Database connection check failed:', error);
        return { status: 'disconnected', error: error.message, timestamp: new Date().toISOString() };
    }
}

module.exports = {
    executeQuery,
    checkDatabaseConnection
};