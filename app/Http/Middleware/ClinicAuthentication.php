<?php

namespace App\Http\Middleware;

use App\Models\ClinicUser;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Symfony\Component\HttpFoundation\Response;

class ClinicAuthentication
{
    public function handle(Request $request, Closure $next, string $role = ''): Response
    {
        try {
            $payload = json_decode(Crypt::decryptString($request->bearerToken() ?? ''), true, flags: JSON_THROW_ON_ERROR);
        } catch (\Throwable) {
            abort(401, 'Session expired. Please log in again.');
        }
        abort_unless(is_array($payload) && isset($payload['user_id'], $payload['expires_at']) && is_int($payload['user_id']) && is_int($payload['expires_at']), 401, 'Session expired. Please log in again.');
        abort_if($payload['expires_at'] <= time(), 401, 'Session expired. Please log in again.');
        $user = ClinicUser::whereKey($payload['user_id'])->first();
        abort_if(! $user || ! $user->is_active, 401, 'Account is unavailable.');
        abort_if($role === 'admin' && $user->role !== 'admin', 403, 'Admin access required.');
        $request->setUserResolver(fn () => $user);

        $response = $next($request);
        if ($response instanceof JsonResponse) {
            $response->setData($this->numericResponse($response->getData(true)));
        }

        return $response;
    }

    private function numericResponse(mixed $value): mixed
    {
        if (! is_array($value)) {
            return $value;
        }
        $decimalFields = ['amount', 'price', 'default_price', 'current_quantity', 'minimum_stock_level', 'acquisition_cost', 'selling_price', 'quantity', 'quantity_used', 'quantity_change', 'quantity_after', 'unit_cost', 'unit_cost_at_use', 'unit_price', 'line_total', 'total_cost', 'total_amount', 'total_paid', 'remaining_balance', 'total_sales', 'total_collected', 'total_outstanding', 'total_expenses', 'total_billed', 'total_quantity_used', 'todays_sales_total', 'outstanding_payments_total', 'todays_expenses_total', 'total'];
        foreach ($value as $key => $item) {
            if (in_array($key, $decimalFields, true) && $item !== null && is_numeric($item)) {
                $value[$key] = (float) $item;
            } elseif (is_array($item)) {
                $value[$key] = $this->numericResponse($item);
            }
        }

        return $value;
    }
}
