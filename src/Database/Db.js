import mongoose from 'mongoose'
import { DB_NAME } from '../../constant.js'
const connectDb = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGO_URI}/${DB_NAME}?retryWrites=true&w=majority`)
        console.log(`\n MongoDB connected !! DB HOST:\n ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log(error)
    }
}
export default connectDb
