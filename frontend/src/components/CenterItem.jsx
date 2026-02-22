import React from 'react'
import { FaDirections, FaPhoneAlt } from "react-icons/fa";

export default function CenterItem({ name, openStatus, distance, address, phone, lat, lng, onSelectCenter }) {

    return (
        <>
            <div onClick={onSelectCenter}>
                <p>{name}</p>
                <p className='text-sm text-gray-500 my-1'>
                    {openStatus ? 'เปิดอยู่' : 'ปิดอยู่'} • {distance.toFixed(1)} กม. • {address}
                </p>
            </div>

            {/* Direction to map, Phone number */}
            <div className='flex items-center gap-2 text-white mt-2'>
                <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 bg-[#FF5F25] w-fit py-1 px-2 rounded-xl text-sm"
                >
                    <FaDirections size={16} />
                    เส้นทาง
                </a>

                {/* Phone */}
                <a href={`tel:${phone}`} className='flex items-center gap-1 bg-[#FF5F25] w-fit py-1 px-2 rounded-xl text-sm'>
                    <FaPhoneAlt size={14} />
                    โทร
                </a>
            </div>
        </>
    );
}