import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { GoSearch } from "react-icons/go";
import { API_BASE_URL } from "../config";
import toast, { Toaster } from "react-hot-toast";
import LoadingPage from "../components/LoadingPage";

const formatCost = (num) =>
    (Number(num) || 0).toLocaleString("th-TH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

// fetch history
function useAssessResult(historyId) {
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let isMounted = true;

        const load = async () => {
            try {
                const res = await fetch(`${API_BASE_URL}/result/${historyId}`);

                if (!res.ok) throw new Error("โหลดผลประเมินไม่สำเร็จ");

                const data = await res.json();

                if (isMounted) {
                    setResult(data);
                    setIsLoading(false);
                }
            } catch (err) {
                toast.error(err.message);
                if (isMounted) setResult(false);
            }
        };

        load();
        return () => { isMounted = false; };
    }, [historyId]);

    return { result, isLoading };
}

// slider image handler
function useImageSlider(totalSlides) {
    const sliderRef = useRef(null);
    const [activeIndex, setActiveIndex] = useState(0);

    const handleSliderScroll = (e) => {
        const el = e.currentTarget;
        const idx = Math.round(el.scrollLeft / (el.clientWidth || 1));
        setActiveIndex(Math.max(0, Math.min(idx, totalSlides - 1)));
    };

    const scrollToIndex = (idx) => {
        const el = sliderRef.current;
        if (!el) return;

        el.scrollTo({
            left: idx * el.clientWidth,
            behavior: "smooth"
        });

        setActiveIndex(idx);
    };

    return { sliderRef, activeIndex, handleSliderScroll, scrollToIndex };
}

// สีตามระดับความเสียหาย
function DamageLevelBadge({ level }) {
    if (level === "Minor") {
        return <p className="bg-[#FFE3BB] rounded-full text-center drop-shadow-md">ชนเบา</p>;
    } else if (level === "Moderate") {
        return <p className="bg-[#F39A75] rounded-full text-center drop-shadow-md">ชนปานกลาง</p>;
    } else if (level === "Severe") {
        return <p className="bg-[#FF5F25] rounded-full text-center drop-shadow-md text-white">ชนหนัก</p>;
    } else if (level === "Unassessable") {
        return <p className="bg-gray-300 rounded-full text-center drop-shadow-md">ไม่ชัดเจน</p>;
    }

    return <p className="bg-gray-200 rounded-full text-center drop-shadow-md">ไม่ระบุ</p>;
}

// slider + dots
function ImageSlider({ items }) {
    const { sliderRef, activeIndex, handleSliderScroll, scrollToIndex } = useImageSlider(items.length);

    return (
        <div className="bg-white my-3 rounded-xl p-4 h-full">
            <div className="relative">
                <div
                    ref={sliderRef}
                    onScroll={handleSliderScroll}
                    className="flex rounded-box w-full overflow-x-auto snap-x snap-mandatory scroll-smooth"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                >
                    {items.map((item, index) => (
                        <div key={index} className="w-full snap-center shrink-0">
                            <img src={item.image_path} alt={`damage-part-${index}`} className="w-full h-52 object-cover rounded-xl" />
                        </div>
                    ))}
                </div>

                {items.length > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-3">
                        {items.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => scrollToIndex(i)}
                                aria-label={`slide-${i + 1}`}
                                className={`h-2 w-2 rounded-full transition-all ${i === activeIndex ? "bg-gray-800" : "bg-gray-300"}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ระดับความเสียหาย
function DamageLevelSection({ items }) {
    return (
        <div className="my-3">
            <div className="flex items-center gap-1">
                <img src="/icon/car-crash.png" alt="car-crash" className="w-11" />
                <h2 className="text-lg font-semibold">ระดับความเสียหาย</h2>
            </div>
            <div>
                {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-3 mb-3 items-center px-2">
                        <p className="col-span-2">{item.part_name_th}</p>
                        <DamageLevelBadge level={item.damage_level} />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ค่าใช้จ่าย + total
function CostSection({ costItems, totalCost }) {
    return (
        <div className="my-3">
            <div className="flex items-center mb-2 gap-2">
                <img src="/icon/cost.png" alt="cost" className="w-8" />
                <h2 className="text-lg font-semibold">ค่าใช้จ่ายเบื้องต้น</h2>
                <p className="bg-[#FF5F25] text-xs text-white px-2 py-0.5 rounded-full">ชนปานกลาง, หนัก</p>
            </div>

            {costItems.length > 0 ? (
                <>
                    {costItems.map((item, index) => (
                        <div key={index} className="flex justify-between px-2">
                            <p>{item.part_name_th}</p>
                            <p>{formatCost(Number(item.price) || 0)}</p>
                        </div>
                    ))}
                    <hr className="opacity-40 my-3" />
                    <div className="text-center">
                        <p className="mt-1 text-[#FF4F0F]">** ราคานี้ยังไม่รวมค่าทำสี ค่าแรง และ Vat **</p>
                        <p className="text-lg">
                            ราคาประมาณการ{" "}
                            {(Number(totalCost) || 0).toLocaleString("th-TH", { maximumFractionDigits: 0 })} บาท
                        </p>
                    </div>
                </>
            ) : (
                <>
                    <p className="text-center text-gray-500">ไม่มีค่าใช้จ่ายเบื้องต้น</p>
                    <hr className="opacity-40 my-4" />
                </>
            )}
        </div>
    );
}

export default function ResultAssess() {
    const { historyId } = useParams();
    const { result, isLoading } = useAssessResult(historyId);

    const items = result?.items ?? [];

    const costItems = useMemo(
        () => items.filter((x) => x && ["Moderate", "Severe"].includes(x.damage_level)),
        [items]
    );

    if (isLoading) {
        return (
            <>
                <Toaster />
                <LoadingPage
                    title="กำลังประเมินค่าใช้จ่ายเบื้องต้น"
                    subtitle="โปรดรอสักครู่..."
                />
            </>
        );
    }

    return (
        <>
            {/* notification */}
            <Toaster />

            {/* head */}
            <div className="flex items-center justify-center bg-white/60 h-20">
                <h1 className="font-bold text-xl text-center text-balance">
                    รายละเอียด <br />การประเมินความเสียหาย
                </h1>
            </div>

            <div className="bg-white/60 rounded-md my-2 p-5">
                {/* User & car info */}
                <div className="mb-5">
                    <div className="flex items-center gap-5 ml-1">
                        <img src="/icon/user.png" alt="user" className="w-6" />
                        <p className="font-semibold text-lg">คุณ {result?.user_name || '-'}</p>
                    </div>
                    <div className="flex items-center mt-3 gap-4">
                        <img src="/icon/car.png" alt="car" className="w-8" />
                        <p>{result?.car_brand} {result?.car_model}</p>
                    </div>

                    <ImageSlider items={items} />
                </div>

                <hr className="opacity-40" />

                {/* assess damage level */}
                <DamageLevelSection items={items} />

                <hr className="opacity-40 mt-5" />

                {/* cost */}
                <CostSection costItems={costItems} totalCost={result?.total_cost} />

                <div className="bg-white w-fit px-3 py-1 rounded-full drop-shadow-md opacity-60 m-auto active:scale-90 transition-transform">
                    <Link to="/map-service" className="flex gap-1 items-center">
                        <GoSearch />
                        <p className="text-sm">ค้นหาศูนย์ซ่อมใกล้ฉัน</p>
                    </Link>
                </div>
            </div>
        </>
    );
}