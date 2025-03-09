import { Logger } from "tslog";

const log: Logger<object> = new Logger<object>({
    minLevel: parseInt(process.env.LOG_LEVEL || '3'),
});

export default log;