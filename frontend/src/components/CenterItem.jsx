import React from 'react'
import { FaDirections, FaPhoneAlt } from "react-icons/fa";

export default function CenterItem({ name, openStatus, distance, duration, address, phone, lat, lng, onSelectCenter, onRoute }) {

    const displayDistance =
        typeof distance === "number"
            ? `${distance.toFixed(2)} กม.`
            : (distance || "-");

    const displayDuration = duration || null;

    return (
        <>
            <div onClick={onSelectCenter}>
                <p>{name}</p>
                <p className='text-sm text-gray-500 my-1'>
                    {openStatus ? 'เปิดอยู่' : 'ปิดอยู่'} • {displayDistance}
                    {displayDuration ? ` • ${displayDuration}` : ''} • {address}
                </p>
            </div>

            {/* Direction to map, Phone number */}
            <div className='flex items-center gap-2 text-white mt-2'>
                <button
                    type="button"
                    onClick={() => onRoute?.({ lat, lng, name, address })}
                    className="flex items-center gap-1 bg-[#FF5F25] w-fit py-1 px-2 rounded-xl text-sm"
                >
                    <FaDirections size={16} />
                    เส้นทาง
                </button>

                {/* Phone */}
                <a href={`tel:${phone}`} className='flex items-center gap-1 bg-[#FF5F25] w-fit py-1 px-2 rounded-xl text-sm'>
                    <FaPhoneAlt size={14} />
                    โทร
                </a>
            </div>
        </>
    );
}