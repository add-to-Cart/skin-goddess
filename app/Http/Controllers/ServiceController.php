<?php

namespace App\Http\Controllers;

use App\Models\Service;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ServiceController extends Controller
{
    public function lookup(Request $request): JsonResponse
    {
        $data = $request->validate(['search' => 'nullable|string|max:100']);
        $search = trim($data['search'] ?? '');
        if ($search === '') {
            return response()->json(['data' => [], 'has_more' => false]);
        }
        $pattern = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], mb_strtolower($search)).'%';
        $services = Service::where('is_active', true)->whereRaw("LOWER(name) LIKE ? ESCAPE '!'", [$pattern])->select(['id', 'name', 'default_price'])->orderBy('name')->orderBy('id')->limit(21)->get();

        return response()->json(['data' => $services->take(20)->values(), 'has_more' => $services->count() > 20]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = Service::query();
        if ($request->boolean('active_only', true)) {
            $query->where('is_active', true);
        }

        return response()->json($query->orderBy('name')->get());
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Service::findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(Service::create($request->validate($this->rules(false)))->refresh(), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $service = Service::findOrFail($id);
        $service->update($request->validate($this->rules(true)));

        return response()->json($service->refresh());
    }

    /** @return array<string, string> */
    private function rules(bool $updating): array
    {
        return ['name' => ($updating ? 'sometimes|required' : 'required').'|string|max:200', 'description' => 'nullable|string', 'default_price' => 'nullable|numeric|min:0|max:99999999.99|decimal:0,2', 'duration_minutes' => 'nullable|integer|min:1', 'is_active' => $updating ? 'sometimes|boolean' : 'prohibited'];
    }
}
