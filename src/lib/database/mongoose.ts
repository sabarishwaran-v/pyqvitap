import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache as MongooseCache;

if (!cached) {
  cached = global.mongooseCache = { conn: null, promise: null };
}

const opts = {
  bufferCommands: false,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
  socketTimeoutMS: 15000,
  maxPoolSize: 1,
};

let activeOperations = 0;
let connectingPromise: Promise<typeof mongoose> | null = null;

export async function connectToDatabase(): Promise<typeof mongoose> {
  const MONGODB_URI = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    throw new Error(
      "Please define the MONGODB_URI environment variable inside .env.local",
    );
  }

  // In Vercel / long-lived Node processes without MONGODB_DIRECT_URI:
  if (!process.env.MONGODB_DIRECT_URI) {
    if (cached.conn && mongoose.connection.readyState === 1) {
      return cached.conn;
    }

    if (!cached.promise) {
      cached.promise = mongoose.connect(MONGODB_URI, opts).catch((err) => {
        cached.promise = null;
        cached.conn = null;
        throw err;
      });
    }

    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (e) {
      cached.promise = null;
      cached.conn = null;
      throw e;
    }
  }

  // In Cloudflare Workers where TCP sockets cannot persist across finished requests:
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (connectingPromise) {
    return await connectingPromise;
  }

  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {}
  }

  connectingPromise = mongoose.connect(MONGODB_URI, opts).finally(() => {
    connectingPromise = null;
  });

  return await connectingPromise;
}

/**
 * Request-scoped database lifecycle abstraction.
 * In Cloudflare Workers: connects, runs the operation, and guarantees disconnection in finally
 * once all database results have been materialized.
 * In Vercel / long-lived Node processes: reuses cached connection without closing.
 */
export async function withDatabase<T>(
  operation: (m: typeof mongoose) => Promise<T>
): Promise<T> {
  const isCloudflare = Boolean(process.env.MONGODB_DIRECT_URI);
  activeOperations++;
  try {
    const m = await connectToDatabase();
    return await operation(m);
  } finally {
    activeOperations = Math.max(0, activeOperations - 1);
    if (isCloudflare && activeOperations === 0) {
      try {
        await mongoose.disconnect();
      } catch (err) {
        console.error("Error disconnecting from MongoDB:", err);
      }
    }
  }
}