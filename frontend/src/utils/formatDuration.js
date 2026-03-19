import React from 'react'

export default function formatDuration(seconds) {
    const mins = Math.round(seconds / 60);

    return mins > 59
        ? `${Math.floor(mins / 60)} ชม. ${mins % 60} นาที`
        : `${mins} นาที`;
}