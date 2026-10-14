<?php

namespace App\Http\Controllers;

use App\Models\Expense;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ExpenseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Expense::query();
        if ($search = $request->input('search')) {
            $query->where(fn ($q) => $q->whereLike('description', "%{$search}%")->orWhereLike('notes', "%{$search}%"));
        }
        if ($category = $request->input('category')) {
            $query->where('category', $category);
        }
        if ($from = $request->input('date_from')) {
            $query->whereDate('expense_date', '>=', $from);
        }
        if ($to = $request->input('date_to')) {
            $query->whereDate('expense_date', '<=', $to);
        }

        return response()->json($query->orderByDesc('expense_date')->orderByDesc('id')->get());
    }

    public function show(int $id): JsonResponse
    {
        return response()->json(Expense::findOrFail($id));
    }

    public function store(Request $request): JsonResponse
    {
        return response()->json(Expense::create($request->validate($this->rules(false)))->refresh(), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $expense = Expense::findOrFail($id);
        $expense->update($request->validate($this->rules(true)));

        return response()->json($expense->refresh());
    }

    public function destroy(int $id): Response
    {
        Expense::findOrFail($id)->delete();

        return response()->noContent();
    }

    /** @return array<string, string> */
    private function rules(bool $updating): array
    {
        $required = $updating ? 'sometimes|required' : 'required';

        return ['expense_date' => "$required|date_format:Y-m-d", 'description' => "$required|string|max:300", 'category' => 'nullable|string|max:50', 'amount' => "$required|numeric|min:0|max:99999999.99|decimal:0,2", 'notes' => 'nullable|string'];
    }
}
