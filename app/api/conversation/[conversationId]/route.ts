import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo } from '@/app/api/utils/common'

export async function DELETE(request: NextRequest, { params }: { params: { conversationId: string } }) {
    const { conversationId } = params
    const { user } = getInfo(request)
    console.log(user)
    console.log('Deleting conversation with ID:', conversationId)
    if (!user) {
        // status 401

        return NextResponse.json({ error: 'User not found' })
    }
    try {
        // delete conversation by id
        const { data } = await client.deleteConversation(conversationId, user)
        console.log('data', data)
        return NextResponse.json(data)
    } catch (error: any) {
        return NextResponse.json({ error: error.message })
    }
}
