import { NextResponse } from "next/server";

export async function getCurrentTime() {
    const response = await fetch("/", {
        next:{
            revalidate: 1,
        },
    });

    
    const data = await NextResponse.json(response);
    console.log(data);

    return data;
}