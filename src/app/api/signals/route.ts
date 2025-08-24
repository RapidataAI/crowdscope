import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const signals = await prisma.signal.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            signalRuns: true
          }
        }
      }
    })
    
    return NextResponse.json(signals)
  } catch (error) {
    console.error('Error fetching signals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch signals' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, question, answerOptions, voteCount, createdBy, userEmail } = body

    if (!name || !question || !answerOptions || !voteCount || !createdBy || !userEmail) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Ensure user exists in our database
    await prisma.user.upsert({
      where: { id: createdBy },
      update: {}, // Don't update anything if user exists
      create: {
        id: createdBy,
        email: userEmail
      }
    })

    const signal = await prisma.signal.create({
      data: {
        name,
        question,
        answerOptions,
        voteCount: parseInt(voteCount),
        createdBy
      }
    })

    return NextResponse.json(signal, { status: 201 })
  } catch (error) {
    console.error('Error creating signal:', error)
    return NextResponse.json(
      { error: 'Failed to create signal' },
      { status: 500 }
    )
  }
}