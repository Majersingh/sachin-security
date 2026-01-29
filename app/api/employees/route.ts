// app/api/employees/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/app/lib/db';

// GET - Fetch all employees
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const searchBy = searchParams.get('searchBy') || 'name';
    const workLocation = searchParams.get('workLocation');
    const gender = searchParams.get('gender');
    const department = searchParams.get('department');
    
    const collection = await getCollection('employees');
    
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
    if (gender) query.gender = gender;
    if (department) query.department = department;
    
    const employees = await collection
      .find(query)
      .sort({ joiningDate: -1 })
      .toArray();
    
    return NextResponse.json({
      success: true,
      data: employees,
      count: employees.length
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
    
    // Validate required fields
    const requiredFields = [
      'fullName', 'fatherName', 'motherName', 'profileFilename', 'profileUrl','dateOfBirth', 'gender',
      'mobileNumber', 'permanentAddress', 'city', 'state', 'pincode',
      'aadharNumber', 'joiningDate', 'uanNumber', 'ifscCode' , 'accountNumber' , 'bankName' ,'workLocation'
    ];
    
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
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
    
    const employeeData = {
      // Personal Information
      fullName: body.fullName,
      fatherName: body.fatherName,
      motherName:body.motherName,
      profileFilename:body.profileFilename,
      profileUrl:body.profileUrl,
      isUploadedtoR2:body.isUploadedtoR2||false,
      dateOfBirth: body.dateOfBirth,
      gender: body.gender,
      bloodGroup: body.bloodGroup || '',
      maritalStatus: body.maritalStatus || '',
      
      // Contact Information
      mobileNumber: body.mobileNumber,
      alternateNumber: body.alternateNumber || '',
      email: body.email || '',
      currentAddress: body.currentAddress,
      permanentAddress: body.permanentAddress || '',
      city: body.city,
      state: body.state,
      pincode: body.pincode,
      
      // Government IDs
      aadharNumber: body.aadharNumber,
      panNumber: body.panNumber,
      
      // Employment Details
      employeeId: body.employeeId,
      designation: body.designation,
      department: body.department,
      joiningDate: body.joiningDate,
      employmentType: body.employmentType || 'Full-time',
      reportingManager: body.reportingManager || '',
      workLocation: body.workLocation || '',
      
      // Salary & Benefits
      basicSalary: body.basicSalary || '',
      hra: body.hra || '',
      otherAllowances: body.otherAllowances || '',
      pfNumber: body.pfNumber || '',
      esiNumber: body.esiNumber || '',
      uanNumber: body.uanNumber || '',
      
      // Bank Details
      bankName: body.bankName || '',
      accountNumber: body.accountNumber || '',
      ifscCode: body.ifscCode || '',
      branchName: body.branchName || '',
      
      // Emergency Contact
      emergencyContactName: body.emergencyContactName || '',
      emergencyContactNumber: body.emergencyContactNumber || '',
      emergencyContactRelation: body.emergencyContactRelation || '',
      
      status: 'Active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await collection.insertOne(employeeData);
    
    return NextResponse.json({
      success: true,
      message: 'Employee added successfully',
      data: { ...employeeData, _id: result.insertedId }
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
