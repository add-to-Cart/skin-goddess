<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

class ClientController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['search' => 'nullable|string|max:100', 'paginated' => 'sometimes|boolean', 'cursor' => 'nullable|string|max:2000']);
        $query = Client::where('is_active', true);
        $query->matchingSearch($request->string('search')->toString());
        $query->orderBy('last_name')->orderBy('first_name')->orderBy('id');

        return response()->json($request->boolean('paginated') ? $query->cursorPaginate(25) : $query->get());
    }

    public function lookup(Request $request): JsonResponse
    {
        $data = $request->validate(['search' => 'nullable|string|max:100', 'first_name' => 'nullable|required_with:last_name|string|max:100', 'last_name' => 'nullable|required_with:first_name|string|max:100']);
        $search = Str::squish($data['search'] ?? '');
        $exactName = isset($data['first_name'], $data['last_name']);
        if (! $exactName && Str::length($search) < 2 && ! preg_match('/^#?\d+$/', $search)) {
            return response()->json(['data' => [], 'has_more' => false]);
        }

        $query = Client::where('is_active', true);
        if ($exactName) {
            $query->whereRaw('LOWER(TRIM(first_name)) = ?', [$this->normalizedText($data['first_name'])])->whereRaw('LOWER(TRIM(last_name)) = ?', [$this->normalizedText($data['last_name'])]);
        } else {
            $query->matchingSearch($search);
        }
        $clients = $query->select(['id', 'first_name', 'last_name', 'phone', 'email', 'is_active'])->orderBy('last_name')->orderBy('first_name')->orderBy('id')->limit(21)->get();

        return response()->json(['data' => $clients->take(20)->values(), 'has_more' => $clients->count() > 20]);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Client::where('is_active', true)->findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $attributes = $request->validate([...$this->rules(false), 'registration_key' => 'nullable|string|min:16|max:100|regex:/^[a-zA-Z0-9_-]+$/']);
        $registrationKey = $attributes['registration_key'] ?? null;
        unset($attributes['registration_key']);
        $attributes['first_name'] = Str::squish($attributes['first_name']);
        $attributes['last_name'] = Str::squish($attributes['last_name']);
        $fingerprint = hash('sha256', json_encode($attributes, JSON_THROW_ON_ERROR));
        $cacheKey = $registrationKey ? 'clinic-registration:'.$request->user()->id.':'.hash('sha256', $registrationKey) : null;

        $response = Cache::lock('clinic-client-registration', 30)->get(function () use ($attributes, $cacheKey, $fingerprint): JsonResponse {
            if ($cacheKey && ($saved = Cache::get($cacheKey))) {
                abort_if($saved['fingerprint'] !== $fingerprint, 409, 'This registration request already belongs to different details. Review the client list before starting another request.');

                return response()->json(Client::findOrFail($saved['id']));
            }
            foreach (Client::query()->orderBy('id')->cursor() as $existing) {
                if ($this->matchesRegistration($existing, $attributes)) {
                    return response()->json([
                        'detail' => "A matching client record already exists (Client #{$existing->id}). Review it before registering another person.",
                        'existing_client' => ['id' => $existing->id, 'is_active' => $existing->is_active],
                    ], 409);
                }
            }

            return DB::transaction(function () use ($attributes, $cacheKey, $fingerprint): JsonResponse {
                $client = Client::create($attributes);
                if ($cacheKey) {
                    Cache::forever($cacheKey, ['id' => $client->id, 'fingerprint' => $fingerprint]);
                }

                return response()->json($client->refresh(), 201);
            });
        });

        return $response ?: response()->json(['detail' => 'Another client registration is being saved. Please retry in a moment.'], 409);
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

    /** @param array{first_name: string, last_name: string, phone?: string|null, email?: string|null, address?: string|null, notes?: string|null} $attributes */
    private function matchesRegistration(Client $client, array $attributes): bool
    {
        if ($this->normalizedText($client->first_name) !== $this->normalizedText($attributes['first_name'])
            || $this->normalizedText($client->last_name) !== $this->normalizedText($attributes['last_name'])) {
            return false;
        }

        $phone = preg_replace('/[^0-9]/', '', $attributes['phone'] ?? '');
        $existingPhone = preg_replace('/[^0-9]/', '', $client->phone ?? '');
        $email = $this->normalizedText($attributes['email'] ?? null);
        if (($phone !== '' && $phone === $existingPhone)
            || ($email !== '' && $email === $this->normalizedText($client->email))) {
            return true;
        }

        return false;
    }

    private function normalizedText(?string $value): string
    {
        return Str::lower(Str::squish($value ?? ''));
    }

    /** @return array<string, string> */
    private function rules(bool $updating): array
    {
        $required = $updating ? 'sometimes|required' : 'required';

        return ['first_name' => "$required|string|max:100", 'last_name' => "$required|string|max:100", 'phone' => 'nullable|string|max:30', 'email' => 'nullable|email|max:255', 'address' => 'nullable|string|max:500', 'notes' => 'nullable|string'];
    }
}
