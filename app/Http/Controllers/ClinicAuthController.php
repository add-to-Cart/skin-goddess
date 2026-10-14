<?php

namespace App\Http\Controllers;

use App\Models\ClinicUser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Response;

class ClinicAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate(['username' => 'required|string|max:100', 'password' => 'required|string']);
        $user = ClinicUser::where('username', mb_strtolower(trim($data['username'])))->first();
        abort_if(! $user || ! password_verify($data['password'], $user->hashed_password ?? ''), 401, 'Incorrect username or password.');
        abort_if(! $user->is_active, 403, 'Account is deactivated. Contact an admin.');
        $token = Crypt::encryptString(json_encode(['user_id' => $user->id, 'expires_at' => time() + 28800], JSON_THROW_ON_ERROR));

        return response()->json(['access_token' => $token, 'token_type' => 'bearer', 'username' => $user->username, 'role' => $user->role]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function logout(): Response
    {
        return response()->noContent();
    }

    public function index(): JsonResponse
    {
        return response()->json(ClinicUser::whereNotNull('username')->orderBy('username')->get());
    }

    public function store(Request $request): JsonResponse
    {
        $request->merge(['username' => mb_strtolower(trim((string) $request->input('username')))]);
        $data = $request->validate(['username' => 'required|string|max:100', 'password' => 'required|string|min:6|max:72', 'role' => 'sometimes|in:admin,staff']);
        abort_if(ClinicUser::where('username', $data['username'])->exists(), 409, 'Username is already taken.');
        $user = ClinicUser::create(['username' => $data['username'], 'hashed_password' => Hash::make($data['password']), 'role' => $data['role'] ?? 'staff', 'is_active' => true]);

        return response()->json($user->refresh(), 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $user = ClinicUser::findOrFail($id);
        $data = $request->validate(['role' => 'sometimes|in:admin,staff', 'is_active' => 'sometimes|boolean', 'password' => 'sometimes|string|min:6|max:72']);
        abort_if($user->id === $request->user()->id && (($data['role'] ?? 'admin') !== 'admin' || ($data['is_active'] ?? true) === false), 400, 'You cannot demote or deactivate your own account.');
        if (isset($data['password'])) {
            $data['hashed_password'] = Hash::make($data['password']);
            unset($data['password']);
        }
        $user->update($data);

        return response()->json($user->refresh());
    }

    public function destroy(Request $request, int $id): Response
    {
        abort_if($id === $request->user()->id, 400, 'You cannot delete your own account.');
        ClinicUser::findOrFail($id)->update(['is_active' => false]);

        return response()->noContent();
    }
}
