import { useState, useCallback } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db, logAudit } from "../firebase";
import { toast } from "react-toastify";

/**
 * Custom hook for user management operations
 *
 * @param {Object} currentUser - The currently authenticated user
 * @returns {Object} User management functions and state
 */
export function useUserManagement(currentUser) {
  const [updating, setUpdating] = useState(false);

  /**
   * Update a user's role
   *
   * @param {string} userId - The user ID to update
   * @param {string} newRole - The new role to assign
   * @param {string} email - The user's email
   * @returns {Promise<boolean>} Whether the update was successful
   */
  const updateUserRole = useCallback(
    async (userId, newRole, email) => {
      if (!currentUser?.email) {
        toast.error("You must be logged in to perform this action");
        return false;
      }

      if (
        !window.confirm(
          `Are you sure you want to change ${email}'s role to ${newRole}?`
        )
      ) {
        return false;
      }

      setUpdating(true);
      try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          role: newRole,
          sessionRevoked: true,
          updatedAt: new Date().toISOString(),
          updatedBy: currentUser.email,
        });

        await logAudit("user_role_updated", currentUser.email, "user", {
          targetUserEmail: email,
          newRole: newRole,
        });

        toast.success(`Role updated to ${newRole} for ${email}`);
        return true;
      } catch (error) {
        console.error("Error updating user role:", error);
        toast.error(`Failed to update ${email}'s role`);
        return false;
      } finally {
        setUpdating(false);
      }
    },
    [currentUser]
  );

  /**
   * Get the display color for different user roles
   *
   * @param {string} role - The user role
   * @returns {string} CSS class for the role color
   */
  const getRoleColor = useCallback((role) => {
    switch (role) {
      case "superadmin":
        return "bg-purple-500";
      case "admin":
        return "bg-blue-500";
      case "user":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  }, []);

  /**
   * Get available role options based on current user's role
   *
   * @param {string} userRole - The current user's role
   * @returns {Array} Array of role options
   */
  const getRoleOptions = useCallback((userRole) => {
    if (userRole === "superadmin") {
      return [
        { value: "admin", label: "Admin", color: "blue" },
        { value: "user", label: "User", color: "gray" },
      ];
    }
    return [{ value: "user", label: "User", color: "gray" }];
  }, []);

  return {
    updating,
    updateUserRole,
    getRoleColor,
    getRoleOptions,
  };
}
