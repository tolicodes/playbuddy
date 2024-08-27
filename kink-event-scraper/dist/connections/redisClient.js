import { createClient } from "redis";
import dotenv from "dotenv";
dotenv.config();
const redisPassword = process.env.REDIS_PASSWORD;
const redisClient = createClient({
    url: `redis://default:${redisPassword}@redis-19131.c239.us-east-1-2.ec2.redns.redis-cloud.com:19131`,
});
export const connectRedisClient = async () => {
    try {
        return redisClient.connect();
    }
    catch (err) {
        console.log(`Something went wrong connecting to redis ${err}`);
        throw err;
    }
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVkaXNDbGllbnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvY29ubmVjdGlvbnMvcmVkaXNDbGllbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLE9BQU8sQ0FBQztBQUNyQyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUM7QUFDNUIsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO0FBRWhCLE1BQU0sYUFBYSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDO0FBQ2pELE1BQU0sV0FBVyxHQUFHLFlBQVksQ0FBQztJQUMvQixHQUFHLEVBQUUsbUJBQW1CLGFBQWEsK0RBQStEO0NBQ3JHLENBQUMsQ0FBQztBQUVILE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLEtBQUssSUFBSSxFQUFFO0lBQzNDLElBQUksQ0FBQztRQUNILE9BQU8sV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQy9CLENBQUM7SUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1FBQ2IsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0Q0FBNEMsR0FBRyxFQUFFLENBQUMsQ0FBQztRQUMvRCxNQUFNLEdBQUcsQ0FBQztJQUNaLENBQUM7QUFDSCxDQUFDLENBQUMifQ==