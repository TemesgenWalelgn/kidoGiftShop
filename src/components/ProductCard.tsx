"use client";

import Link from "next/link";

export default function ProductCard({ product }: any) {
  return (
    <Link href={`/products/${product.id}`}>
      <div className="border rounded-lg shadow p-3 cursor-pointer hover:shadow-xl transition">

        <img
          src={product.imageUrl}
          alt={product.title}
          className="w-full h-48 object-cover rounded"
        />

        <h2 className="text-lg font-bold mt-3">
          {product.title}
        </h2>

        <p className="text-gray-600 text-sm line-clamp-2">
          {product.description}
        </p>

        <p className="font-bold mt-3 text-green-600">
          {product.price} ETB
        </p>

      </div>
    </Link>
  );
}