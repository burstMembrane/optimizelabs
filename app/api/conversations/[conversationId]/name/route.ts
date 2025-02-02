import { type NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo } from '@/app/api/utils/common'
import { generateConversationName } from '../../../../../service/index';

export async function POST(request: NextRequest, { params }: {
  params: { conversationId: string, name: string }
}) {
  const body = await request.json()
  const {
    auto_generate,
    name,
  } = body
  const { conversationId } = params
  const { user } = getInfo(request)



  // auto generate name
  const { data } = await client.generateConversationName(conversationId, name, user, auto_generate)
  return NextResponse.json(data)
}
