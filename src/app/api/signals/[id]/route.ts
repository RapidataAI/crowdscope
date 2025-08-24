import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { active } = body
    
    if (typeof active !== 'boolean') {
      return NextResponse.json(
        { error: 'Active field must be boolean' },
        { status: 400 }
      )
    }

    const signal = await prisma.signal.update({
      where: { id: params.id },
      data: { active }
    })

    return NextResponse.json(signal)
  } catch (error) {
    console.error('Error updating signal:', error)
    return NextResponse.json(
      { error: 'Failed to update signal' },
      { status: 500 }
    )
  }
}