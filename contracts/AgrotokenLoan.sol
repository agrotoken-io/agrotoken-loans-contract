/*
SPDX-License-Identifier: UNLICENSED
(c) Developed by AgroToken
This work is unlicensed.
*/
pragma solidity 0.8.7;
import "hardhat/console.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract AgrotokenLoan is Initializable {
  address public admin;

  function initialize() public initializer{
    admin = msg.sender;
    console.log("Deploying AgrotokenLoan", admin);
    //   ID del préstamo
    // Dirección pública del usuario.
    // Monto del préstamo (total tokens a enviar, monto en tokens + aforo)
    // Fecha de vencimiento prestamo
    // Limite de liquidación
    // Tasas de Interes (tasa de interes de prestamo a finalizacion o pago en fecha, tasa por pago anticiapado con un a funcion)
    // Token
    // Estado
  }
}