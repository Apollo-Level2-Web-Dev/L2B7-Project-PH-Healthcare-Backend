import { UploadApiResponse } from "cloudinary";
import { cloudinary } from "../../lib/cloudinary";
import { prisma } from "../../lib/prisma";

const uploadProfileImage = async (buffer : Buffer, userId : string) =>{
    // const cloudinaryResult = cloudinary.uploader.upload_stream(
    //     {
    //         resource_type : "auto"
    //     },

    //     async (error, result) => {
    //         if(error){
    //             console.log(error);
    //             throw new Error(error.message)
    //         }

    //         console.log(result, "result");

    //         const updatedUser = await prisma.user.update({
    //             where : {
    //                 id : userId
    //             },

    //             data: {
    //                 imageUrl : result?.secure_url,
    //                 imagePublicId : result?.public_id
    //             }
    //         })

    //         console.log(updatedUser);

    //         // return result
    //     }
    // ).end(buffer)

    const currentUser = await prisma.user.findUnique({
        where: {
            id: userId
        },
        select: {
            imagePublicId: true,
            imageUrl: true
        }
    })

    const cloudinaryResult = await new Promise<UploadApiResponse>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
            {
                resource_type: "auto"
            },

            async (error, result) => {
                if (error) {
                    return reject(error);
                }

                if(!result){
                    return reject(new Error("No result returned from Cloudinary"));
                }

                resolve(result);
            }
        ).end(buffer)
    })

    const updatedUser = await prisma.user.update({
        where: {
            id: userId
        },

        data: {
            imageUrl: cloudinaryResult.secure_url,
            imagePublicId: cloudinaryResult.public_id
        },

        omit:{
            password : true
        }
    })

    if(currentUser?.imagePublicId && currentUser.imageUrl){
        await cloudinary.uploader.destroy(currentUser.imagePublicId)
    }


    return updatedUser
}

export const UserServices = {
    uploadProfileImage
}