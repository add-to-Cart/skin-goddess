<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ClientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Client::where('is_active', true);
        if ($search = $request->input('search')) {
            $query->where(fn ($q) => $q->whereLike('first_name', "%{$search}%")->orWhereLike('last_name', "%{$search}%")->orWhereLike('phone', "%{$search}%"));
        }

        return response()->json($query->orderBy('last_name')->orderBy('first_name')->get());
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Client::where('is_active', true)->findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $client = Client::create($request->validate($this->rules(false)));

        return response()->json($client->refresh(), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $client = Client::where('is_active', true)->findOrFail($id);
        $client->update($request->validate($this->rules(true)));

        return response()->json($client->refresh());
    }

    public function destroy(int $id): Response
    {
        Client::where('is_active', true)->findOrFail($id)->update(['is_active' => false]);

        return response()->noContent();
    }

    /** @return array<string, string> */
    private function rules(bool $updating): array
    {
        $required = $updating ? 'sometimes|required' : 'required';

        return ['first_name' => "$required|string|max:100", 'last_name' => "$required|string|max:100", 'phone' => 'nullable|string|max:30', 'email' => 'nullable|email|max:255', 'address' => 'nullable|string|max:500', 'notes' => 'nullable|string'];
    }
}
