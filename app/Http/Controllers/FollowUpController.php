<?php

namespace App\Http\Controllers;

use App\Models\FollowUp;
use App\Models\Procedure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FollowUpController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['search' => 'nullable|string|max:100', 'paginated' => 'sometimes|boolean', 'cursor' => 'nullable|string|max:2000']);
        $query = FollowUp::query();
        if ($search = trim($request->string('search')->toString())) {
            $query->where(function ($matches) use ($search): void {
                $matches->whereHas('client', fn ($client) => $client->matchingSearch($search));
                if (preg_match('/^#?(\d+)$/', $search, $id)) {
                    $matches->orWhere('id', $id[1]);
                }
            });
        }
        if ($request->boolean('include_client')) {
            $query->with('client:id,first_name,last_name,is_active');
        }
        foreach (['client_id', 'status'] as $field) {
            if ($request->filled($field)) {
                $query->where($field, $request->input($field));
            }
        }
        if ($from = $request->input('date_from')) {
            $query->whereDate('follow_up_date', '>=', $from);
        }
        if ($to = $request->input('date_to')) {
            $query->whereDate('follow_up_date', '<=', $to);
        }

        if ($request->boolean('paginated')) {
            $query->select('follow_ups.*')->selectRaw('follow_up_date as cursor_date')->orderBy('cursor_date');
        } else {
            $query->orderBy('follow_up_date');
        }
        $query->orderBy('id');

        return response()->json($request->boolean('paginated') ? $query->cursorPaginate(25) : $query->get());
    }

    public function upcoming(Request $request): JsonResponse
    {
        $data = $request->validate(['days_ahead' => 'sometimes|integer|min:1|max:90']);

        return response()->json(FollowUp::whereIn('status', ['upcoming', 'due'])->whereBetween('follow_up_date', [today(config('clinic.timezone'))->toDateString(), today(config('clinic.timezone'))->addDays($data['days_ahead'] ?? 7)->toDateString()])->orderBy('follow_up_date')->get());
    }

    public function overdue(Request $request): JsonResponse
    {
        $query = FollowUp::whereIn('status', ['upcoming', 'due'])->whereDate('follow_up_date', '<', today(config('clinic.timezone')));

        return response()->json($request->boolean('count_only') ? ['count' => $query->count()] : $query->orderBy('follow_up_date')->get());
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(FollowUp::findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate(['client_id' => 'required|integer|exists:clients,id', 'procedure_id' => 'nullable|integer|exists:procedures,id', 'follow_up_date' => 'required|date_format:Y-m-d', 'status' => 'sometimes|in:upcoming,due,completed,cancelled', 'notes' => 'nullable|string']);
        if (isset($data['procedure_id'])) {
            abort_unless(Procedure::where('client_id', $data['client_id'])->whereKey($data['procedure_id'])->exists(), 422, 'Procedure does not belong to this client.');
        }

        return response()->json(FollowUp::create($data)->refresh(), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $followUp = FollowUp::findOrFail($id);
        $followUp->update($request->validate(['follow_up_date' => 'sometimes|required|date_format:Y-m-d', 'status' => 'sometimes|in:upcoming,due,completed,cancelled', 'notes' => 'nullable|string']));

        return response()->json($followUp->refresh());
    }
}
