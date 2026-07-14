import {tools} from "./tools/index.ts"
export type Toolname = keyof typeof tools;

export const executeTool = async (name: string, args: any) => {
    const tool = tools[name as Toolname];

    if (!tool) {
        return "Unknown tool. this does not exist"
    }

    const execute = tool.execute;
    
    if (!execute) {
        return `This is not a registered tool`
    }

    const result = await execute(args, {
        toolCallId: "",
        messages: []
    })

    return String(result);
}