import { Document } from "@langchain/core/documents";
import { prisma } from "../../lib/prisma";
import { vectorStore } from "../../lib/vectorStore";
import { DoctorVerificationStatus } from "../../../generated/prisma/enums";

const INDEX_BATCH_SIZE = 20;

const indexableDoctorSelect = {
    id: true,
    name: true,
    specialization: true,
    qualifications: true,
    experienceYears: true,
    bio: true
}  as const

type TIndexableDoctor = {
    id: string;
    name: string;
    specialization: string;
    qualifications: string;
    experienceYears: number;
    bio: string | null;
}

export const buildDoctorDocument = (doctor: TIndexableDoctor) =>
    new Document({
        pageContent: [
			`Dr. ${doctor.name}`,
			`Specialization: ${doctor.specialization}`,
			`Qualifications: ${doctor.qualifications}`,
			`Experience: ${doctor.experienceYears} years`,
			doctor.bio ? `About: ${doctor.bio}` : "",
		]
			.filter(Boolean)
			.join("\n"),
		metadata: { doctorId: doctor.id },
    })


export const upsertDoctorEmbedding = async(doctorId: string)=>{
    const doctor = await prisma.doctor.findUnique({
        where: {id: doctorId},
        select: {
            ...indexableDoctorSelect,
            isDeleted: true,
            verificationStatus: true
        }
    })

    await vectorStore.delete({ids: [doctorId]})

    if(!doctor || doctor.isDeleted|| doctor.verificationStatus !== DoctorVerificationStatus.APPROVED){
        return
    }

    await vectorStore.addDocuments([buildDoctorDocument(doctor)], {
		ids: [doctor.id], 
	});
}

export const reindexAllDoctors = async() =>{
    const doctors = await prisma.doctor.findMany({
        where: {
            isDeleted: false,
            verificationStatus: DoctorVerificationStatus.APPROVED
        }
    })

    await prisma.doctorEmbeddig.deleteMany({
        where: {id: {notIn: doctors.map((doctor)=> doctor.id)}}
    })


    for (let i=0; i<doctors.length; i+=INDEX_BATCH_SIZE){
        const batch = doctors.slice(i, i+INDEX_BATCH_SIZE);
        const ids = batch.map((doctor)=>doctor.id);

        await vectorStore.delete({ids})
        await vectorStore.addDocuments(batch.map(buildDoctorDocument), {ids})
    }
    return doctors.length
}