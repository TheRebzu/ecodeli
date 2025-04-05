import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { v4 as uuidv4 } from 'uuid';

// Demo data storage - in a real app, this would be in the database
const todoStore: Record<string, any[]> = {};

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    // Get todos from our store or initialize with demo data
    if (!todoStore[session.user.id]) {
      todoStore[session.user.id] = [
        {
          id: 'demo-1',
          title: 'Complete profile setup',
          completed: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          userId: session.user.id
        },
        {
          id: 'demo-2',
          title: 'Review new orders',
          completed: true,
          createdAt: new Date(Date.now() - 86400000), // 1 day ago
          updatedAt: new Date(),
          userId: session.user.id
        },
        {
          id: 'demo-3',
          title: 'Check shipping status',
          completed: false,
          createdAt: new Date(Date.now() - 172800000), // 2 days ago
          updatedAt: new Date(),
          userId: session.user.id
        }
      ];
    }
    
    // Return the todos for this user
    return NextResponse.json({ 
      success: true, 
      data: todoStore[session.user.id] 
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch todos' 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const { title } = await request.json();
    
    if (!title || typeof title !== 'string' || title.trim() === '') {
      return NextResponse.json({ 
        success: false, 
        message: 'Title is required' 
      }, { status: 400 });
    }
    
    // Initialize the todos array if it doesn't exist
    if (!todoStore[session.user.id]) {
      todoStore[session.user.id] = [];
    }
    
    // Create a new todo
    const newTodo = {
      id: uuidv4(),
      title: title.trim(),
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: session.user.id
    };
    
    // Add it to the store
    todoStore[session.user.id].unshift(newTodo);
    
    return NextResponse.json({ 
      success: true, 
      data: newTodo
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to create todo' 
    }, { status: 500 });
  }
}

// PUT method to update a todo
export async function PUT(request: Request) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    const { id, completed } = await request.json();
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Todo ID is required' 
      }, { status: 400 });
    }
    
    // Find and update the todo
    const userTodos = todoStore[session.user.id] || [];
    const todoIndex = userTodos.findIndex(todo => todo.id === id);
    
    if (todoIndex === -1) {
      return NextResponse.json({ 
        success: false, 
        message: 'Todo not found' 
      }, { status: 404 });
    }
    
    // Update the todo
    todoStore[session.user.id][todoIndex] = {
      ...todoStore[session.user.id][todoIndex],
      completed: completed !== undefined ? completed : todoStore[session.user.id][todoIndex].completed,
      updatedAt: new Date()
    };
    
    return NextResponse.json({ 
      success: true, 
      data: todoStore[session.user.id][todoIndex]
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to update todo' 
    }, { status: 500 });
  }
}

// DELETE method to remove a todo
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    
    if (!session?.user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }
    
    if (!id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Todo ID is required' 
      }, { status: 400 });
    }
    
    // Remove the todo
    const userTodos = todoStore[session.user.id] || [];
    const todoIndex = userTodos.findIndex(todo => todo.id === id);
    
    if (todoIndex === -1) {
      return NextResponse.json({ 
        success: false, 
        message: 'Todo not found' 
      }, { status: 404 });
    }
    
    // Remove the todo from the store
    todoStore[session.user.id].splice(todoIndex, 1);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Todo deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting todo:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to delete todo' 
    }, { status: 500 });
  }
} 