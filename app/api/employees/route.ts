// app/api/employees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/app/lib/db';
import { encryptId } from '@/app/lib/idcrypto';
import { createEmployeeUser } from '@/app/lib/users';
import { getMissingRequired, buildEmployeeFieldValues } from '@/app/lib/employeeFields';

// GET - Fetch all employees
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const searchBy = searchParams.get('searchBy') || 'name';
    const workLocation = searchParams.get('workLocation');
    const state = searchParams.get('state');
    const gender = searchParams.get('gender');
    const department = searchParams.get('department');
    const designation = searchParams.get('designation');
    const meta = searchParams.get('meta');

    const collection = await getCollection('employees');

    // Meta mode: return distinct values for the filter dropdowns so the UI does
    // not need to load every employee just to build the dropdown options.
    if (meta === 'filters') {
      const [workLocations, states, departments, designations] = await Promise.all([
        collection.distinct('workLocation'),
        collection.distinct('state'),
        collection.distinct('department'),
        collection.distinct('designation'),
      ]);
      const clean = (arr: any[]) => arr.filter(Boolean).sort();
      return NextResponse.json({
        success: true,
        filters: {
          workLocations: clean(workLocations),
          states: clean(states),
          departments: clean(departments),
          designations: clean(designations),
        },
      });
    }

    // Meta mode: return direct-report counts per manager as a single aggregation
    // so the reporting page can show accurate counts without loading every row.
    if (meta === 'reportCounts') {
      const agg = await collection
        .aggregate([
          { $match: { reportingManagerId: { $nin: [null, ''] } } },
          { $group: { _id: '$reportingManagerId', count: { $sum: 1 } } },
        ])
        .toArray();
      const counts: Record<string, number> = {};
      agg.forEach((r: any) => {
        counts[r._id] = r.count;
      });
      return NextResponse.json({ success: true, counts });
    }

    // Meta mode: return just the hierarchy fields for every employee so the
    // reporting page can build the full org tree in one lightweight request
    // (this is intentionally not paginated — a tree needs all nodes at once).
    if (meta === 'hierarchy') {
      const rows = await collection
        .find(
          {},
          { projection: { _id: 0, employeeId: 1, fullName: 1, designation: 1, department: 1, reportingManagerId: 1, profileUrl: 1 } }
        )
        .toArray();
      return NextResponse.json({ success: true, data: rows });
    }

    // Pagination params
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10) || 50));
    const skip = (page - 1) * limit;

    let query: any = {};

    // Search filter
    if (search) {
      if (searchBy === 'name') {
        query.fullName = { $regex: search, $options: 'i' };
      } else if (searchBy === 'aadharNumber') {
        query.aadharNumber = { $regex: search, $options: 'i' };
      }
    }

    // Additional filters
    if (workLocation) query.workLocation = workLocation;
    if (state) query.state = state;
    if (gender) query.gender = gender;
    if (department) query.department = department;
    if (designation) query.designation = designation;

    // Total count for pagination (respects the same filters)
    const total = await collection.countDocuments(query);

    const employees = await collection
      .find(query)
      .sort({ joiningDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Attach an obfuscated token used for the QR verification link so the
    // raw (guessable) employeeId is never exposed in the public URL.
    const data = employees.map((emp: any) => ({
      ...emp,
      idToken: emp.employeeId ? encryptId(emp.employeeId) : null,
    }));

    return NextResponse.json({
      success: true,
      data,
      count: data.length,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// POST - Add new employee
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields against the central field registry.
    const missing = getMissingRequired(body);
    if (missing.length > 0) {
      return NextResponse.json(
        { success: false, error: `${missing[0].label} is required` },
        { status: 400 }
      );
    }

    const collection = await getCollection('employees');
    
    // Check if employee ID already exists
    const existingEmployee = await collection.findOne({ 
      aadharNumber: body.aadharNumber
    });
    
    if (existingEmployee) {
      return NextResponse.json(
        { success: false, error: 'Employee already exists with this Aadhar' },
        { status: 400 }
      );
    }
    const totalEmployees = await collection.countDocuments({});
    const employeeData: Record<string, any> = {
      // All form fields (values + per-field defaults) from the central registry.
      ...buildEmployeeFieldValues(body),

      // Server-managed fields (not collected from the form body):
      isUploadedtoR2: body.isUploadedtoR2 || false,
      employeeId: `ss-${totalEmployees + 1}`,
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const result = await collection.insertOne(employeeData);

    // Auto-create a login account for the new employee (role: employee) with a
    // temporary password that must be reset on first login.
    let tempPassword: string | null = null;
    let loginId: string | null = null;
    try {
      const account = await createEmployeeUser({
        employeeId: employeeData.employeeId,
        email: employeeData.email,
        name: employeeData.fullName,
      });
      tempPassword = account.tempPassword;
      loginId = employeeData.email || employeeData.employeeId;
    } catch (e) {
      console.error('Failed to create employee login account:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Employee added successfully',
      data: { ...employeeData, _id: result.insertedId },
      // Shown once so HR can hand the credentials to the employee.
      account: tempPassword ? { loginId, tempPassword } : null,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
